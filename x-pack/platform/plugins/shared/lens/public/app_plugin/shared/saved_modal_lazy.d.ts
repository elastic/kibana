import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { SaveModalContainerProps } from '../save_modal_container';
import type { LensPluginStartDependencies } from '../../plugin';
export declare function getSaveModalComponent(coreStart: CoreStart, startDependencies: LensPluginStartDependencies): (props: Omit<SaveModalContainerProps, "lensServices">) => React.JSX.Element;
