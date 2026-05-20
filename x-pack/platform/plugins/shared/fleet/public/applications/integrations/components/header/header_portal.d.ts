import type { AppMountParameters } from '@kbn/core/public';
import type { FC } from 'react';
import React from 'react';
import type { FleetStartServices } from '../../../../plugin';
export interface Props {
    children: React.ReactNode;
    setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
    startServices: Pick<FleetStartServices, 'analytics' | 'i18n' | 'theme'>;
}
export declare const HeaderPortal: FC<Props>;
