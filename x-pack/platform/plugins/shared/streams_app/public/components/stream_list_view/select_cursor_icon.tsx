/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export function SelectCursorIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.64653 2.64647C2.7766 2.5164 2.96742 2.46861 3.1436 2.52147L13.1436 5.52147C13.329 5.57709 13.4654 5.73437 13.4942 5.92577C13.5228 6.11734 13.4386 6.30855 13.2774 6.416L10.7842 8.07713L13.8536 11.1465C14.0488 11.3417 14.0488 11.6582 13.8536 11.8535L11.8536 13.8535C11.6583 14.0488 11.3418 14.0488 11.1465 13.8535L8.07719 10.7842L6.41606 13.2773C6.30861 13.4385 6.1174 13.5227 5.92583 13.4941C5.73443 13.4654 5.57715 13.3289 5.52153 13.1435L2.52153 3.14354C2.46867 2.96736 2.51646 2.77653 2.64653 2.64647ZM6.1729 11.8379L7.58403 9.72264L7.65532 9.63768C7.73522 9.56166 7.8394 9.51301 7.95122 9.50194C8.10012 9.48734 8.24775 9.54066 8.35356 9.64647L11.5 12.793L12.793 11.5L9.64653 8.3535C9.54072 8.24769 9.4874 8.10006 9.502 7.95116C9.51676 7.80209 9.59806 7.66706 9.7227 7.58397L11.8379 6.17284L3.74516 3.7451L6.1729 11.8379Z"
        fill="currentColor"
      />
    </svg>
  );
}
