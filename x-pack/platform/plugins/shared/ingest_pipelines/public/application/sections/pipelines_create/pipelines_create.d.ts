import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import type { Pipeline } from '../../../../common/types';
interface Props {
    /**
     * This value may be passed in to prepopulate the creation form
     */
    sourcePipeline?: Pipeline;
}
export declare const PipelinesCreate: React.FunctionComponent<RouteComponentProps & Props>;
export {};
