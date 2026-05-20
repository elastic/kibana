/**
 * Documentation for the Math Expression Language
 *
 * This file generates documentation from language_definition.ts.
 * It contains only non-language elements like intro text and section labels.
 */
export declare const mathExpressionLanguageIntro: string;
export interface MathLanguageDocumentationSections {
    groups: Array<{
        label: string;
        description?: string;
        items: Array<{
            label: string;
            description: {
                markdownContent: string;
                openLinksInNewTab?: boolean;
            };
        }>;
    }>;
    initialSection: string;
}
/**
 * Get documentation sections formatted for LanguageDocumentationPopover.
 *
 * IMPORTANT: The LanguageDocumentationPopover expects the first group to be a navigation
 * entry for the initialSection (intro). The content pane renders groups.slice(1), so the
 * first group's items are never displayed - only its label is used for sidebar navigation
 * to scroll to the intro section.
 */
export declare function getMathExpressionLanguageDocSections(): MathLanguageDocumentationSections;
