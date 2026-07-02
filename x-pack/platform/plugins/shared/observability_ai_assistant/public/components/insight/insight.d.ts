import React from 'react';
import { type Message } from '../../../common/types';
export interface InsightProps {
    messages: Message[] | (() => Promise<Message[] | undefined>);
    title: string;
    dataTestSubj?: string;
    showElasticLlmCallout?: boolean;
}
export declare function Insight({ messages: initialMessagesOrCallback, title, dataTestSubj, showElasticLlmCallout, }: InsightProps): React.JSX.Element | null;
