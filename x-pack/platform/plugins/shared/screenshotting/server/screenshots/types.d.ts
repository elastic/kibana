export interface PhaseInstance {
    timeoutValue: number;
    configValue: string;
    label: string;
}
export interface PhaseTimeouts {
    openUrl: PhaseInstance;
    waitForElements: PhaseInstance;
    renderComplete: PhaseInstance;
}
export interface Screenshot {
    /**
     * Screenshot PNG image data.
     */
    data: Buffer;
    /**
     * Screenshot title.
     */
    title: string | null;
    /**
     * Screenshot description.
     */
    description: string | null;
}
