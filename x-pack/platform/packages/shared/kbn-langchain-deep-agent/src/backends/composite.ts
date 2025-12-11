/**
 * CompositeBackend: Route operations to different backends based on path prefix.
 */

import type {
  BackendProtocol,
  EditResult,
  FileInfo,
  GrepMatch,
  WriteResult,
} from "./protocol";

/**
 * Backend that routes file operations to different backends based on path prefix.
 *
 * This enables hybrid storage strategies like:
 * - `/memories/` → StoreBackend (persistent, cross-thread)
 * - Everything else → StateBackend (ephemeral, per-thread)
 *
 * The CompositeBackend handles path prefix stripping/re-adding transparently.
 */
export class CompositeBackend implements BackendProtocol {
  private default: BackendProtocol;
  private routes: Record<string, BackendProtocol>;
  private sortedRoutes: Array<[string, BackendProtocol]>;

  constructor(
    defaultBackend: BackendProtocol,
    routes: Record<string, BackendProtocol>,
  ) {
    this.default = defaultBackend;
    this.routes = routes;

    // Sort routes by length (longest first) for correct prefix matching
    this.sortedRoutes = Object.entries(routes).sort(
      (a, b) => b[0].length - a[0].length,
    );
  }

  /**
   * Determine which backend handles this key and strip prefix.
   *
   * @param key - Original file path
   * @returns Tuple of [backend, stripped_key] where stripped_key has the route
   *          prefix removed (but keeps leading slash).
   */
  private getBackendAndKey(key: string): [BackendProtocol, string] {
    // Check routes in order of length (longest first)
    for (const [prefix, backend] of this.sortedRoutes) {
      if (key.startsWith(prefix)) {
        // Strip full prefix and ensure a leading slash remains
        // e.g., "/memories/notes.txt" → "/notes.txt"; "/memories/" → "/"
        const suffix = key.substring(prefix.length);
        const strippedKey = suffix ? "/" + suffix : "/";
        return [backend, strippedKey];
      }
    }

    return [this.default, key];
  }

  /**
   * List files and directories in the specified directory (non-recursive).
   *
   * @param path - Absolute path to directory
   * @returns List of FileInfo objects with route prefixes added, for files and directories
   *          directly in the directory. Directories have a trailing / in their path and is_dir=true.
   */
  async lsInfo(path: string): Promise<FileInfo[]> {
    // Check if path matches a specific route
    for (const [routePrefix, backend] of this.sortedRoutes) {
      if (path.startsWith(routePrefix.replace(/\/$/, ""))) {
        // Query only the matching routed backend
        const suffix = path.substring(routePrefix.length);
        const searchPath = suffix ? "/" + suffix : "/";
        const infos = await backend.lsInfo(searchPath);

        // Add route prefix back to paths
        const prefixed: FileInfo[] = [];
        for (const fi of infos) {
          prefixed.push({
            ...fi,
            path: routePrefix.slice(0, -1) + fi.path,
          });
        }
        return prefixed;
      }
    }

    // At root, aggregate default and all routed backends
    if (path === "/") {
      const results: FileInfo[] = [];
      const defaultInfos = await this.default.lsInfo(path);
      results.push(...defaultInfos);

      // Add the route itself as a directory (e.g., /memories/)
      for (const [routePrefix] of this.sortedRoutes) {
        results.push({
          path: routePrefix,
          is_dir: true,
          size: 0,
          modified_at: "",
        });
      }

      results.sort((a, b) => a.path.localeCompare(b.path));
      return results;
    }

    // Path doesn't match a route: query only default backend
    return await this.default.lsInfo(path);
  }

  /**
   * Read file content, routing to appropriate backend.
   *
   * @param filePath - Absolute file path
   * @param offset - Line offset to start reading from (0-indexed)
   * @param limit - Maximum number of lines to read
   * @returns Formatted file content with line numbers, or error message
   */
  async read(
    filePath: string,
    offset: number = 0,
    limit: number = 2000,
  ): Promise<string> {
    const [backend, strippedKey] = this.getBackendAndKey(filePath);
    return await backend.read(strippedKey, offset, limit);
  }

  /**
   * Structured search results or error string for invalid input.
   */
  async grepRaw(
    pattern: string,
    path: string = "/",
    glob: string | null = null,
  ): Promise<GrepMatch[] | string> {
    // If path targets a specific route, search only that backend
    for (const [routePrefix, backend] of this.sortedRoutes) {
      if (path.startsWith(routePrefix.replace(/\/$/, ""))) {
        const searchPath = path.substring(routePrefix.length - 1);
        const raw = await backend.grepRaw(pattern, searchPath || "/", glob);

        if (typeof raw === "string") {
          return raw;
        }

        // Add route prefix back
        return raw.map((m) => ({
          ...m,
          path: routePrefix.slice(0, -1) + m.path,
        }));
      }
    }

    // Otherwise, search default and all routed backends and merge
    const allMatches: GrepMatch[] = [];
    const rawDefault = await this.default.grepRaw(pattern, path, glob);

    if (typeof rawDefault === "string") {
      return rawDefault;
    }

    allMatches.push(...rawDefault);

    // Search all routes
    for (const [routePrefix, backend] of Object.entries(this.routes)) {
      const raw = await backend.grepRaw(pattern, "/", glob);

      if (typeof raw === "string") {
        return raw;
      }

      // Add route prefix back
      allMatches.push(
        ...raw.map((m) => ({
          ...m,
          path: routePrefix.slice(0, -1) + m.path,
        })),
      );
    }

    return allMatches;
  }

  /**
   * Structured glob matching returning FileInfo objects.
   */
  async globInfo(pattern: string, path: string = "/"): Promise<FileInfo[]> {
    const results: FileInfo[] = [];

    // Route based on path, not pattern
    for (const [routePrefix, backend] of this.sortedRoutes) {
      if (path.startsWith(routePrefix.replace(/\/$/, ""))) {
        const searchPath = path.substring(routePrefix.length - 1);
        const infos = await backend.globInfo(pattern, searchPath || "/");

        // Add route prefix back
        return infos.map((fi) => ({
          ...fi,
          path: routePrefix.slice(0, -1) + fi.path,
        }));
      }
    }

    // Path doesn't match any specific route - search default backend AND all routed backends
    const defaultInfos = await this.default.globInfo(pattern, path);
    results.push(...defaultInfos);

    for (const [routePrefix, backend] of Object.entries(this.routes)) {
      const infos = await backend.globInfo(pattern, "/");
      results.push(
        ...infos.map((fi) => ({
          ...fi,
          path: routePrefix.slice(0, -1) + fi.path,
        })),
      );
    }

    // Deterministic ordering
    results.sort((a, b) => a.path.localeCompare(b.path));
    return results;
  }

  /**
   * Create a new file, routing to appropriate backend.
   *
   * @param filePath - Absolute file path
   * @param content - File content as string
   * @returns WriteResult with path or error
   */
  async write(filePath: string, content: string): Promise<WriteResult> {
    const [backend, strippedKey] = this.getBackendAndKey(filePath);
    return await backend.write(strippedKey, content);
  }

  /**
   * Edit a file, routing to appropriate backend.
   *
   * @param filePath - Absolute file path
   * @param oldString - String to find and replace
   * @param newString - Replacement string
   * @param replaceAll - If true, replace all occurrences
   * @returns EditResult with path, occurrences, or error
   */
  async edit(
    filePath: string,
    oldString: string,
    newString: string,
    replaceAll: boolean = false,
  ): Promise<EditResult> {
    const [backend, strippedKey] = this.getBackendAndKey(filePath);
    return await backend.edit(strippedKey, oldString, newString, replaceAll);
  }
}
