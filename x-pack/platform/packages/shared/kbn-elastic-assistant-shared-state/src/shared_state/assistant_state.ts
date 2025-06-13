import { BehaviorSubject, ReplaySubject } from "rxjs";
import { takeUntil } from 'rxjs';

export class AssistantState {
    private readonly stop$ = new ReplaySubject<void>(1);

    public start() {
        const open$ = new BehaviorSubject<boolean>(false);

        return {
            setOpen: (open: boolean) => {
                open$.next(open);
                return () => {
                    // Do nothing
                }
            },

            getOpen$: () =>
                open$.pipe(
                    takeUntil(this.stop$)
                ),
        };
    }

    public stop() {
        this.stop$.next();
    }
}