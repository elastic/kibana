import { BehaviorSubject, ReplaySubject } from "rxjs";
import { takeUntil } from 'rxjs';


export class SignalIndexService {
    private readonly stop$ = new ReplaySubject<void>(1);

    public start() {
        const signalIndex$ = new BehaviorSubject<string | undefined>(undefined);

        return {
            setSignalIndex: (signalIndex: string | undefined) => {
                signalIndex$.next(signalIndex);
                return () => {
                    signalIndex$.next(undefined);
                }
            },

            getSignalIndex$: () =>
                signalIndex$.pipe(
                    takeUntil(this.stop$)
                ),
        };
    }

    public stop() {
        this.stop$.next();
    }
}