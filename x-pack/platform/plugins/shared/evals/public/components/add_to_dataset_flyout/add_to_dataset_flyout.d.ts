import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { AddToDatasetFlyoutOpenOptions } from '../../types';
export declare function AddToDatasetFlyout({ coreStart, options, onClose, }: {
    coreStart: CoreStart;
    options: AddToDatasetFlyoutOpenOptions;
    onClose: () => void;
}): React.JSX.Element;
