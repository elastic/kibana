import { BehaviorSubject, ReplaySubject } from "rxjs";
import { takeUntil } from 'rxjs';
import { PromptContextTemplate } from '@kbn/elastic-assistant';


export class PromptContextService {
    private readonly stop$ = new ReplaySubject<void>(1);

    public start() {
        const promptContext$ = new BehaviorSubject<Record<string, PromptContextTemplate>>({});

        return {
            setPromptContext: (promptContext: Record<string, PromptContextTemplate>) => {
                promptContext$.next(promptContext);
                return () => {
                    promptContext$.next({});
                }
            },

            getPromptContext$: () =>
                promptContext$.pipe(
                    takeUntil(this.stop$)
                ),
        };
    }

    public stop() {
        this.stop$.next();
    }
}