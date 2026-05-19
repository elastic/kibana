import type { CoreSetup, Logger } from '@kbn/core/server';
import type { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import type { PersistableStateAttachmentTypeRegistry } from '../attachment_framework/persistable_state_registry';
import type { ConfigType } from '../config';
interface RegisterSavedObjectsArgs {
    core: CoreSetup;
    logger: Logger;
    persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
    lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
    config: ConfigType;
}
export declare const registerSavedObjects: ({ core, logger, persistableStateAttachmentTypeRegistry, lensEmbeddableFactory, config, }: RegisterSavedObjectsArgs) => void;
export {};
