import type { HttpStart } from '@kbn/core/public';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
interface SetupDeps {
    share: Pick<SharePluginSetup, 'setAnonymousAccessServiceProvider'>;
}
interface StartDeps {
    http: HttpStart;
}
/**
 * Service that allows to retrieve application state.
 */
export declare class AnonymousAccessService {
    private internalService;
    setup({ share }: SetupDeps): void;
    start({ http }: StartDeps): void;
}
export {};
