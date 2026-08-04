export interface BashExecResult {
    stdout: string;
    stderr: string;
    exit_code: number;
    truncated?: boolean;
}
/**
 * Public contract for the bash runtime.
 */
export interface IBashService {
    exec(command: string): Promise<BashExecResult>;
    getOrCreateWorkspaceId(): string;
    getWorkspaceId(): string | undefined;
}
