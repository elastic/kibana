import React from 'react';
import type { UsePackageIconType } from '../../../../../hooks';
export declare function IconPanel({ packageName, integrationName, version, icons, }: Pick<UsePackageIconType, 'packageName' | 'integrationName' | 'version' | 'icons'>): React.JSX.Element;
export declare function LoadingIconPanel(): React.JSX.Element;
export declare function ErrorIconPanel(): React.JSX.Element;
export interface MiniIconProps extends Pick<UsePackageIconType, 'packageName' | 'integrationName' | 'version' | 'icons'> {
    size?: number;
}
export declare function MiniIcon({ packageName, integrationName, version, icons }: MiniIconProps): React.JSX.Element;
