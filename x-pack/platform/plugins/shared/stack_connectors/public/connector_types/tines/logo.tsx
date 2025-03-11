/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LogoProps } from '../types';

const Logo = (props: LogoProps) => (
  <svg
    version="1.1"
    id="Layer_1"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    x="0"
    y="0"
    width="32px"
    height="32px"
    viewBox="0 0 32 32"
    enableBackground="new 0 0 32 32"
    xmlSpace="preserve"
    {...props}
  >
    <g>
      <rect y="128.4" className="st0" width="25.7" height="46.6" style={{ fill: '#06AC38' }} />
      <path
        className="st0"
        style={{ fill: '#8578E6' }}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.8018 0C8.01458 0 4.66599 2.45749 3.53258 6.06868L0.415527 16L3.53258 25.9313C4.66599 29.5425 8.01458 32 11.8018 32H20.1981C23.9853 32 27.3339 29.5425 28.4673 25.9313L31.5844 16L28.4673 6.06868C27.3339 2.45749 23.9853 0 20.1981 0H11.8018ZM20.1982 2.49634C22.8938 2.49634 25.2772 4.24548 26.0839 6.81577L26.8481 9.25062C25.3107 7.98154 23.3639 7.26723 21.3292 7.26707L10.648 7.26679C8.62691 7.26694 6.69264 7.97168 5.16015 9.22481L5.91625 6.81577C6.72297 4.24548 9.10635 2.49634 11.8019 2.49634H20.1982ZM5.73674 12.1986L3.79587 14.7519L28.1811 14.7519L26.2404 12.1989C25.0741 10.6646 23.2571 9.76356 21.329 9.76341H10.5898C8.68349 9.78153 6.89125 10.6798 5.73674 12.1986ZM28.1771 17.2482L26.2403 19.7989C25.0739 21.3349 23.2555 22.237 21.326 22.2368L10.6509 22.2366C8.72137 22.2367 6.90298 21.3346 5.73661 19.7986L3.79996 17.2482L28.1771 17.2482ZM5.9161 25.1842C6.72282 27.7545 9.1062 29.5037 11.8018 29.5037H20.1981C22.8936 29.5037 25.277 27.7545 26.0837 25.1842L26.8485 22.7476C25.3104 24.0182 23.3622 24.7333 21.3258 24.7332L10.651 24.7329C8.6283 24.7331 6.69244 24.0274 5.15921 22.7727L5.9161 25.1842Z"
      />
    </g>
  </svg>
);

// eslint-disable-next-line import/no-default-export
export { Logo as default };
