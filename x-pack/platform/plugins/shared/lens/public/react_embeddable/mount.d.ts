import type { CoreStart, OverlayFlyoutOpenOptions } from '@kbn/core/public';
/**
 * Shared logic to mount the inline config panel
 * @param ConfigPanel
 * @param coreStart
 * @param overlayTracker
 * @param uuid
 * @param container
 */
export declare const mountInlinePanel: ({ core, api, loadContent, options: { dataTestSubj, uuid, container }, }: {
    core: CoreStart;
    api?: unknown;
    loadContent: ({ closeFlyout, }?: {
        closeFlyout: () => void;
    }) => Promise<JSX.Element | null | void>;
    uuid?: string;
    options?: {
        dataTestSubj?: string;
        uuid?: string;
        container?: HTMLElement | null;
    };
}) => Promise<void>;
export declare const lensFlyoutProps: OverlayFlyoutOpenOptions & {
    triggerId?: string;
};
