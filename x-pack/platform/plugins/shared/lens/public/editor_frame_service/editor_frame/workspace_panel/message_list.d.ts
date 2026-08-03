import React from 'react';
import type { SerializedStyles } from '@emotion/react';
import type { UserMessage } from '@kbn/lens-common';
export declare const MessageList: ({ messages, customButtonStyles, }: {
    messages: UserMessage[];
    customButtonStyles?: SerializedStyles;
}) => React.JSX.Element;
