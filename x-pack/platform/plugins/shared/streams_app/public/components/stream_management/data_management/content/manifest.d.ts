import type { ContentPackManifest } from '@kbn/content-packs-schema';
import React from 'react';
export declare function ContentPackMetadata({ manifest, readonly, onChange, }: {
    manifest: ContentPackManifest;
    readonly?: boolean;
    onChange?: (manifest: ContentPackManifest) => void;
}): React.JSX.Element;
