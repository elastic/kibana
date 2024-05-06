/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { useContext, useEffect, useMemo } from 'react';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useMlKibana } from '../../contexts/kibana';
import { MlPageControlsContext } from '../ml_page';

export interface HeaderMenuPortalProps {
  children: ReactNode;
}

export const HeaderMenuPortal: FC<HeaderMenuPortalProps> = ({ children }) => {
  const { services } = useMlKibana();
  const { theme, i18n } = services;

  const { setHeaderActionMenu } = useContext(MlPageControlsContext);

  const portalNode = useMemo(() => createHtmlPortalNode(), []);

  useEffect(() => {
    if (!setHeaderActionMenu) {
      return;
    }

    setHeaderActionMenu((element) => {
      const mount = toMountPoint(
        <KibanaContextProvider services={services}>
          <OutPortal node={portalNode} />
        </KibanaContextProvider>,
        { theme, i18n }
      );
      return mount(element);
    });

    return () => {
      portalNode.unmount();
      setHeaderActionMenu(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portalNode, setHeaderActionMenu, services.theme.theme$]);

  return <InPortal node={portalNode}>{children}</InPortal>;
};
