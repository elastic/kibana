import type { FunctionComponent } from 'react';
import type { Fields } from '../processor_form.container';
interface Props {
    defaultOptions?: Fields['fields'];
}
/**
 * This is a catch-all component to support settings for custom processors
 * or existing processors not yet supported by the UI.
 *
 * We store the settings in a field called "customOptions"
 **/
export declare const Custom: FunctionComponent<Props>;
export {};
