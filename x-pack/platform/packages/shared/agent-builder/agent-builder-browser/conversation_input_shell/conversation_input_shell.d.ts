import React from 'react';
export interface ConversationInputShellProps extends React.HTMLAttributes<HTMLDivElement> {
    isDisabled?: boolean;
    isCollapsed?: boolean;
}
/**
 * Visual shell for conversation input areas. Provides the shared border,
 * border-radius, shadow, and background styling used by the agent_builder
 * ConversationInput and any consumers that embed a compatible launcher UI.
 *
 * Accepts a forwarded ref (for e.g. measuring position before animations)
 * and standard HTML div attributes (aria-label, data-test-subj, etc.).
 * Additional Emotion `css` styles can be composed via the `css` JSX prop.
 */
export declare const ConversationInputShell: React.ForwardRefExoticComponent<ConversationInputShellProps & {
    children?: React.ReactNode | undefined;
} & React.RefAttributes<HTMLDivElement>>;
