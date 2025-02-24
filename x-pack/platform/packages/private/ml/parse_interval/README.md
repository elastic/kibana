# @kbn/ml-parse-interval

The `parse_interval` package provides the `parseInterval` utility function for parsing time intervals in various formats.

## Usage

```javascript
import { parseInterval } = from '@kbn/ml-parse-interval';

const intervalString = '1d';
const intervalInMs = parseInterval(intervalString);

console.log(intervalInMs); // Output: 86400000
```
