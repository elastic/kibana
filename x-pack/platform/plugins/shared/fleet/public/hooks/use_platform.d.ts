export type PLATFORM_TYPE = 'linux_aarch64' | 'linux_x86_64' | 'mac_aarch64' | 'mac_x86_64' | 'windows' | 'rpm_aarch64' | 'rpm_x86_64' | 'deb_aarch64' | 'deb_x86_64' | 'kubernetes' | 'windows_msi';
export type EXTENDED_PLATFORM_TYPE = 'linux_aarch64' | 'linux_x86_64' | 'mac_aarch64' | 'mac_x86_64' | 'windows' | 'rpm_aarch64' | 'rpm_x86_64' | 'deb_aarch64' | 'deb_x86_64' | 'kubernetes' | 'windows_msi' | 'google_shell' | 'cloud_formation';
interface PLATFORM_OPTION {
    label: string;
    id: PLATFORM_TYPE;
    'data-test-subj'?: string;
}
export declare const PLATFORM_WITH_INSTALL_SERVERS: string[];
export declare const VISIBLE_PLATFORM_OPTIONS: PLATFORM_OPTION[];
export declare const EXTENDED_PLATFORM_OPTIONS: PLATFORM_OPTION[];
export declare const KUBERNETES_PLATFORM_OPTION: PLATFORM_OPTION;
export declare function usePlatform(initialPlatform?: PLATFORM_TYPE): {
    platform: PLATFORM_TYPE;
    setPlatform: import("react").Dispatch<import("react").SetStateAction<PLATFORM_TYPE>>;
};
export {};
