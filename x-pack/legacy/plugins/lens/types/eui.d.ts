/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module '@elastic/eui' {
  interface EuiOutsideClickDetectorProps {
    children: React.ReactNode;
    isDisabled?: boolean;
    onOutsideClick: React.MouseEventHandler<Element>;
  }
  export const EuiOutsideClickDetector: React.SFC<EuiOutsideClickDetectorProps>;
}
