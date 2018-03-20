import { KbnError } from '../../errors';

export class NoLeadingWildcardsError extends KbnError {
  constructor() {
    super(
      'Leading wildcards are disabled. See query:allowLeadingWildcards in Advanced Settings.',
      NoLeadingWildcardsError
    );
  }
}
