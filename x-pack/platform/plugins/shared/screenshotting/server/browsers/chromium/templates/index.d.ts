interface GetHeaderArgs {
    title: string;
}
export declare function getHeaderTemplate({ title }: GetHeaderArgs): Promise<string>;
export declare function getDefaultFooterLogo(): Promise<string>;
interface GetFooterArgs {
    logo?: string;
}
export declare function getFooterTemplate({ logo }: GetFooterArgs): Promise<string>;
export {};
