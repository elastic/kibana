import { getDefaultEuiMarkdownParsingPlugins, getDefaultEuiMarkdownProcessingPlugins, getDefaultEuiMarkdownUiPlugins } from '@elastic/eui';
export declare const usePlugins: (disabledPlugins?: string[]) => {
    uiPlugins: ReturnType<typeof getDefaultEuiMarkdownUiPlugins>;
    parsingPlugins: ReturnType<typeof getDefaultEuiMarkdownParsingPlugins>;
    processingPlugins: ReturnType<typeof getDefaultEuiMarkdownProcessingPlugins>;
};
