import React from 'react';
export type Feedback = 'positive' | 'negative';
interface FeedbackButtonsProps {
    onClickFeedback: (feedback: Feedback) => void;
}
export declare function FeedbackButtons({ onClickFeedback }: FeedbackButtonsProps): React.JSX.Element | null;
export {};
