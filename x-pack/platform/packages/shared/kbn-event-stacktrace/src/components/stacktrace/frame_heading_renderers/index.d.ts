import type { ComponentType } from 'react';
import type { Stackframe } from '@kbn/apm-types';
export interface FrameHeadingRendererProps {
    fileDetailComponent: ComponentType<React.PropsWithChildren<{}>>;
    stackframe: Stackframe;
    idx?: string;
}
export { CSharpFrameHeadingRenderer } from './c_sharp_frame_heading_renderer';
export { DefaultFrameHeadingRenderer } from './default_frame_heading_renderer';
export { JavaFrameHeadingRenderer } from './java_frame_heading_renderer';
export { JavaScriptFrameHeadingRenderer } from './java_script_frame_heading_renderer';
export { RubyFrameHeadingRenderer } from './ruby_frame_heading_renderer';
export { PhpFrameHeadingRenderer } from './php_frame_heading_renderer';
