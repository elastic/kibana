import React from 'react';
import type { Processor } from '../../../../common/types';
import type { OnUpdateHandler, OnDoneLoadJsonHandler } from '../pipeline_editor';
interface Props {
    processors: Processor[];
    onFailure?: Processor[];
    onLoadJson: OnDoneLoadJsonHandler;
    onProcessorsUpdate: OnUpdateHandler;
    hasVersion: boolean;
    hasMeta: boolean;
    onEditorFlyoutOpen: () => void;
    isEditing?: boolean;
    canEditName?: boolean;
}
export declare const PipelineFormFields: React.FunctionComponent<Props>;
export {};
