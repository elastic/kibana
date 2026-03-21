export interface Process {
    args?: string[];
    pid: number;
    ppid?: number;
    title?: string;
}
