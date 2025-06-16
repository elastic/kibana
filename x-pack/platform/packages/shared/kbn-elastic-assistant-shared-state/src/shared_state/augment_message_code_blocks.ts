import { BehaviorSubject, ReplaySubject } from "rxjs";
import { takeUntil } from 'rxjs';
import { CodeBlockDetails, Conversation } from '@kbn/elastic-assistant';

export type AugmentMessageCodeBlocks = (
    currentConversation: Conversation,
    showAnonymizedValues: boolean
) => CodeBlockDetails[][]

export class AugmentMessageCodeBlocksService {
    private readonly stop$ = new ReplaySubject<void>(1);

    public start() {
        const augmentMessageCodeBlocks$ = new BehaviorSubject<AugmentMessageCodeBlocks>(() => []);

        return {
            registerAugmentMessageCodeBlocks: (augmentMessageCodeBlocks: AugmentMessageCodeBlocks) => {
                augmentMessageCodeBlocks$.next(augmentMessageCodeBlocks);
                return () => {
                    augmentMessageCodeBlocks$.next(() => []);
                }
            },

            getAugmentMessageCodeBlocks$: () =>
                augmentMessageCodeBlocks$.pipe(
                    takeUntil(this.stop$)
                ),
        };
    }

    public stop() {
        this.stop$.next();
    }
}