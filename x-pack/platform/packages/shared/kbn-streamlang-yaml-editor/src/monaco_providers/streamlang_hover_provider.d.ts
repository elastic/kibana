import { monaco } from '@kbn/monaco';
/**
 * Monaco hover provider for Streamlang actions
 * Provides rich documentation when hovering over action properties
 */
export declare class StreamlangHoverProvider implements monaco.languages.HoverProvider {
    private readonly actionHandler;
    constructor();
    provideHover(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.Hover | null>;
    private buildHoverContext;
}
/**
 * Create a new instance of the Streamlang hover provider
 */
export declare function createStreamlangHoverProvider(): monaco.languages.HoverProvider;
