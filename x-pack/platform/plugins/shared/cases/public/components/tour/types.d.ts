import type { ReactNode } from 'react';
import type { EuiTourStepProps } from '@elastic/eui';
/** A single step in a {@link GuidedTour}. */
export interface CasesTourStep {
    /** Stable identifier, also used to key the EuiTourStep and build its data-test-subj. */
    stepId: string;
    title: string;
    content: ReactNode;
    /** CSS selector for the element the step's popover anchors to (usually a data-test-subj). */
    anchor: string;
    anchorPosition: EuiTourStepProps['anchorPosition'];
}
