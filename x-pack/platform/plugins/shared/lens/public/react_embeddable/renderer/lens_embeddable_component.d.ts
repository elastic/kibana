import React from 'react';
import type { LensInternalApi } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';
export declare function LensEmbeddableComponent({ internalApi, api, onUnmount, }: {
    internalApi: LensInternalApi;
    api: LensApi;
    onUnmount: () => void;
}): React.JSX.Element;
