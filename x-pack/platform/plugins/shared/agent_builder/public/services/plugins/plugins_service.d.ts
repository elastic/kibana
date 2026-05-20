import type { HttpSetup } from '@kbn/core-http-browser';
import type { DeletePluginResponse } from '../../../common/http_api/plugins';
export declare class PluginsService {
    private readonly http;
    constructor({ http }: {
        http: HttpSetup;
    });
    list(): Promise<import("@kbn/agent-builder-common").PluginDefinition[]>;
    get({ pluginId }: {
        pluginId: string;
    }): Promise<import("@kbn/agent-builder-common").PluginDefinition>;
    delete({ pluginId, force }: {
        pluginId: string;
        force?: boolean;
    }): Promise<DeletePluginResponse>;
    installFromUrl({ url, pluginName }: {
        url: string;
        pluginName?: string;
    }): Promise<import("@kbn/agent-builder-common").PluginDefinition>;
    upload({ file, pluginName }: {
        file: File;
        pluginName?: string;
    }): Promise<import("@kbn/agent-builder-common").PluginDefinition>;
}
