export class WmsClient {
    constructor({ serviceUrl }: {
        serviceUrl: any;
    });
    _serviceUrl: any;
    _fetch(url: any): Promise<Response>;
    _createUrl(defaultQueryParams: any): string;
    getUrlTemplate(layers: any, styles: any): string;
    /**
     * Extend any query parameters supplied in the URL but override with required defaults
     * (ex. service must be WMS)
     */
    _fetchCapabilities(): Promise<unknown>;
    getCapabilities(): Promise<{
        layers: any;
        styles: any;
    }>;
}
