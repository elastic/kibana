export interface LogoOption {
    label: string;
    isDefault?: boolean;
    loadIconUrl: () => Promise<string>;
}
export declare const LOGO_OPTIONS: Readonly<Record<string, LogoOption>>;
