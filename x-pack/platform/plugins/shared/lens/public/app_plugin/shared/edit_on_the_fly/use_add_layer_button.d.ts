import type { ReactElement } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { FramePublicAPI } from '@kbn/lens-common';
import type { LensPluginStartDependencies } from '../../../plugin';
export declare const useAddLayerButton: (framePublicAPI: FramePublicAPI, coreStart: CoreStart, dataViews: LensPluginStartDependencies["dataViews"], uiActions: LensPluginStartDependencies["uiActions"], setIsInlineFlyoutVisible: (flag: boolean) => void) => ReactElement | null;
