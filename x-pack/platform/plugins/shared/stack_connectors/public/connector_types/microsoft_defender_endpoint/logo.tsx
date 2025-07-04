/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiIcon, EuiIconProps } from '@elastic/eui';

const MicrosoftIconSvg = memo(() => {
  return (
    <svg
      version="1.0"
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 400 400"
    >
      <g fill="#0b61ce">
        <path d="M180.3 52.4c-13.4 2.6-24.4 7.2-38 16C118.8 83.5 88.1 91.8 54.8 92c-4.2 0-7.8.4-8 1-.1.5 0 19.5.3 42.2.5 35.9.9 42.9 2.7 53.3 6.4 36 18.4 67.1 37.2 95.9 24.3 37.2 57.6 67 97.8 87.3 7.9 4 14.9 7.3 15.6 7.3 2.7 0 29.9-14.3 41.1-21.7C302 317.6 341.4 255.5 352 183.4c1.7-12.1 2-18.9 2-52.7V92h-6.7c-34.5-.1-64.2-8.2-90.3-24.6-19.2-12.1-30.4-15.4-53.5-16-10.8-.2-18.3.1-23.2 1zm38.2 20c9.9 2.2 17.4 5.3 26.4 10.9 13.7 8.6 15.2 9.4 24.1 13.2 18.8 8.1 37.8 12.8 57.5 14.4l8 .6-.1 27.5c-.2 43-4.9 68.2-18.9 101-20.4 47.8-60.4 90.2-106.6 113.1l-8.6 4.2-10.9-5.7c-50.5-26.7-88.8-70.3-108.2-123.1-11.1-30.1-14.2-49.6-14.5-91l-.2-26 5-.3c25.8-1.4 59.1-11.6 78.5-24 13.4-8.6 21.7-12.4 33.5-15.1 6.1-1.4 28.2-1.2 35 .3z" />
        <path d="M189.5 92.6c-12.4 3-16.1 4.6-27.6 12-15.6 10.1-39.3 19.4-59.4 23.4-5.5 1.1-11.1 2.3-12.4 2.6l-2.4.5.6 21.2c.9 34.4 6.8 58.8 21.2 88.2 11.2 22.7 23.6 39.6 43.1 58.5 14.4 13.9 30.3 25.8 44 32.8l4.1 2.1 7.5-4.3c49.4-28.2 85.5-76.4 99.4-132.9 3.6-14.9 5.4-30.9 5.4-49.4 0-16 0-16.3-2.2-16.8-1.3-.3-5.9-1.2-10.3-2.1-22.8-4.4-44.6-13-63.5-25.1-14-8.8-19-10.5-33.5-10.9-6.6-.1-12.9-.1-14 .2zM227 173c-5.5 11-10 20.2-10 20.5 0 .2 9 .6 20.1.7l20.1.3-45.8 45.7c-25.2 25.2-45.9 45.6-46.1 45.4-.2-.2 6.4-13.9 14.6-30.5L195 225h-30.6l18-36 18.1-36H237l-10 20z" />
      </g>
    </svg>
  );
});
MicrosoftIconSvg.displayName = 'MicrosoftIconSvg';

export const MicrosoftDefenderEndpointLogo = memo<Omit<EuiIconProps, 'type'>>((props) => {
  return <EuiIcon {...props} type={MicrosoftIconSvg} />;
});
MicrosoftDefenderEndpointLogo.displayName = 'MicrosoftDefenderEndpointLogo';

// eslint-disable-next-line import/no-default-export
export { MicrosoftDefenderEndpointLogo as default };
