import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { MlServicesContext } from '../../../application/app';
interface StartPlugins {
    data: DataPublicPluginStart;
    share: SharePluginStart;
    lens: LensPublicStart;
}
export type StartServices = CoreStart & StartPlugins & MlServicesContext;
export declare const useMlFromLensKibanaContext: () => import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<CoreStart> & CoreStart & StartPlugins & MlServicesContext>;
export {};
