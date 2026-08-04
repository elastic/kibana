import type { HttpStart } from '@kbn/core-http-browser';
import React from 'react';
interface Props {
    http: HttpStart;
    ruleId?: string;
}
export declare const LinkedActionPoliciesStep: ({ http, ruleId }: Props) => React.JSX.Element;
export {};
