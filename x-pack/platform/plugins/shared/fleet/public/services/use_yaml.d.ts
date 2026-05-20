import type { loadYaml } from '@kbn/yaml-loader';
type YamlModule = Awaited<ReturnType<typeof loadYaml>>;
/**
 * React hook that loads the yaml package asynchronously.
 * Returns the yaml module (parse, stringify, Document, etc.) once loaded, or null while loading.
 * The module is cached globally so subsequent hook calls resolve synchronously.
 */
export declare const useYaml: () => YamlModule | null;
export {};
