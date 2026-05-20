import type { FC } from 'react';
import type { LensApi } from '@kbn/lens-plugin/public';
interface Props {
    embeddable: LensApi;
    onClose: () => void;
}
export declare const LensLayerSelectionFlyout: FC<Props>;
export {};
