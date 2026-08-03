export declare enum McpLogoPickerTab {
    SELECT = "select",
    UPLOAD = "upload"
}
export interface NoneClientLogo {
    type: 'none';
}
export interface SelectClientLogo {
    type: 'select';
    id: string;
    dataUrl: string;
}
export interface UploadClientLogo {
    type: 'upload';
    file: File;
    dataUrl: string;
}
export type ClientLogo = NoneClientLogo | SelectClientLogo | UploadClientLogo;
export declare const NO_CLIENT_LOGO: NoneClientLogo;
export declare enum RedirectUriType {
    LOCAL = "local",
    REMOTE = "remote"
}
export interface RedirectUri {
    value: string;
}
export interface RedirectUriConfig {
    type: RedirectUriType;
    uris: Array<RedirectUri>;
}
export interface McpClientFormData {
    clientName: string;
    clientLogo: ClientLogo;
    redirect: RedirectUriConfig;
    isConfidential: boolean;
}
