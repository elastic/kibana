import React from 'react';
import type { AppMountParameters } from '@kbn/core/public';
import type { FleetStartServices } from '../../../../plugin';
export declare const IntegrationsHeader: ({ setHeaderActionMenu, startServices, }: {
    setHeaderActionMenu: AppMountParameters["setHeaderActionMenu"];
    startServices: Pick<FleetStartServices, "analytics" | "i18n" | "theme">;
}) => React.JSX.Element;
