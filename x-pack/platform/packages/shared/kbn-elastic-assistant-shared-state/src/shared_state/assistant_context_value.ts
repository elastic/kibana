import { UseAssistantContext } from "@kbn/elastic-assistant/impl/assistant_context";
import { BehaviorSubject, ReplaySubject } from "rxjs";
import { takeUntil } from 'rxjs';

export class AssistantContextValueService {
    private readonly stop$ = new ReplaySubject<void>(1);

    public start() {
        const assistantContextValue$ = new BehaviorSubject<UseAssistantContext | undefined>(undefined);

        return {
            setAssistantContextValue: (assistantContextValue: UseAssistantContext) => {
                assistantContextValue$.next(assistantContextValue);
                return () => {
                    assistantContextValue$.next(undefined);
                }
            },

            getAssistantContextValue$: () =>
                assistantContextValue$.pipe(
                    takeUntil(this.stop$)
                ),
        };
    }

    public stop() {
        this.stop$.next();
    }
}