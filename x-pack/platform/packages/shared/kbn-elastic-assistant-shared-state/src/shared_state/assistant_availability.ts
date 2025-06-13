import { BehaviorSubject, ReplaySubject } from "rxjs";
import { takeUntil } from 'rxjs';
import { UseAssistantAvailability } from '@kbn/elastic-assistant';


export class AssistantAvailabilityService {
  private readonly stop$ = new ReplaySubject<void>(1);

  public start() {
    const assistantAvailability$ = new BehaviorSubject<UseAssistantAvailability | undefined>(undefined);

    return {
      setAssistantAvailability: (assistantAvailability: UseAssistantAvailability) => {
        assistantAvailability$.next(assistantAvailability);
        return () => {
          assistantAvailability$.next(undefined);
        }
      },

      getAssistantAvailability$: () =>
        assistantAvailability$.pipe(
          takeUntil(this.stop$)
        ),
    };
  }

  public stop() {
    this.stop$.next();
  }
}