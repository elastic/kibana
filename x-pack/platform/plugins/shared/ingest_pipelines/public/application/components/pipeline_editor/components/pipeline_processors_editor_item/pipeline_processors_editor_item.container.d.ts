import type { FunctionComponent } from 'react';
import type { Props as ViewComponentProps } from './pipeline_processors_editor_item';
type Props = Omit<ViewComponentProps, 'editor' | 'processorsDispatch'>;
export declare const PipelineProcessorsEditorItem: FunctionComponent<Props>;
export {};
