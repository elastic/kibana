import { EuiTourStep } from "@elastic/eui"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Conversation } from "../../assistant_context/types"
import { isEmpty, throttle } from "lodash"
import useLocalStorage from "react-use/lib/useLocalStorage"
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from "../const"
import { anonymizedValuesAndCitationsTourStep1 } from "./step_config"
import { TourState } from "../knowledge_base"

type Props = {
    conversation: Conversation | undefined
}

// Throttles reads from local storage to 1 every 5 seconds.
// This is to prevent reading from local storage too frequently on every render.
const getKnowledgeBaseTourStateThrottled = throttle(() => {
    const value = localStorage.getItem(NEW_FEATURES_TOUR_STORAGE_KEYS.KNOWLEDGE_BASE)
    if (value) {
        return JSON.parse(value) as TourState
    }
    return undefined
}, 5000);

export const AnonymizedValuesAndCitationsTour: React.FC<Props> = ({ conversation }) => {
    const [tourCompleted, setTourCompleted] = useLocalStorage<boolean>(
        NEW_FEATURES_TOUR_STORAGE_KEYS.ANONYMIZED_VALUES_AND_CITATIONS,
        false
    );

    const [showTour, setShowTour] = useState(false)

    useEffect(() => {
        if (showTour || !conversation || tourCompleted) {
            return
        }

        const knowledgeBaseTourState = getKnowledgeBaseTourStateThrottled();

        // If the knowledge base tour is active on this page (i.e. step 1), don't show this tour to prevent overlap.
        if (knowledgeBaseTourState?.isTourActive && knowledgeBaseTourState?.currentTourStep === 1) {
            return
        }

        const conaintsContentReferences = conversation.messages && conversation.messages.some((message) => message.metadata?.contentReferences != null);
        const containsReplacements = !(conversation.replacements == null || isEmpty(conversation.replacements));
        let timer: NodeJS.Timeout | null = null;
        if (conaintsContentReferences || containsReplacements) {
            timer = setTimeout(() => {
                setShowTour(true);
            }, 1000);
            return
        }

        return () => {
            if (timer) {
                clearTimeout(timer)
            }
        }
    }, [conversation, tourCompleted, setShowTour])

    const finishTour = useCallback(
        () => {
            setTourCompleted(true)
            setShowTour(false)
        },
        [setTourCompleted, setShowTour]
    );

    const tourElement = useMemo(() => (
        <EuiTourStep
            data-test-subj="anonymizedValuesAndCitationsTourStep"
            panelProps={{
                'data-test-subj': `anonymizedValuesAndCitationsTourStepPanel`,
            }}
            anchor={anonymizedValuesAndCitationsTourStep1.anchor}
            content={anonymizedValuesAndCitationsTourStep1.content}
            isStepOpen={showTour}
            maxWidth={300}
            onFinish={finishTour}
            step={1}
            stepsTotal={1}
            title={anonymizedValuesAndCitationsTourStep1.title}
            subtitle={anonymizedValuesAndCitationsTourStep1.subTitle}
            anchorPosition="rightUp"
        />
    ), [showTour, setShowTour, finishTour])

    return tourElement
}