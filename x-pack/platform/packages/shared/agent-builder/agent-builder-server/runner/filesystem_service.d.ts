import type { IFileSystem } from 'just-bash';
/**
 * Public contract for the agent's unified virtual filesystem service.
 */
export interface IFilesystemService {
    /**
     * Returns the unified `IFileSystem` shared between `read_file` and `bash`.
     * The contract is just-bash's `IFileSystem` — POSIX-like, byte-level.
     */
    getFilesystem(): IFileSystem;
    /**
     * Persist any filesystem state that needs to survive across rounds (today:
     * the `/workspace` mount to ES). No-op when nothing changed. Called at the
     * end of each agent round.
     */
    flush(): Promise<void>;
}
