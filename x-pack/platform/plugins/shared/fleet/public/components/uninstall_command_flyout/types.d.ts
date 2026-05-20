export declare const UNINSTALL_COMMAND_TARGETS: readonly ["agent", "endpoint"];
export type UninstallCommandTarget = (typeof UNINSTALL_COMMAND_TARGETS)[number];
export type PLATFORMS_FOR_UNINSTALL = 'linuxOrMac' | 'windows';
export type Commands = {
    [key in PLATFORMS_FOR_UNINSTALL]: string;
};
