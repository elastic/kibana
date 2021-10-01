# Tips for using the SO INFO SVC 

## From an FTR test
```
  ...
  const soInfo = getService('savedObjectInfo');
  const log = getService('log');

  describe('some test suite', function () {
    ...

    after(async () => {
      // "Normal" logging, without JQ
      await soInfo.logSoTypes(log);
      // Without a title, using JQ
      await soInfo.filterSoTypes(log, '.[] | .key'); 
      // With a title, using JQ
      await soInfo.filterSoTypes(
        log,
        'reduce .[].doc_count as $item (0; . + $item)',
        'TOTAL count of ALL Saved Object types'
      );
      // With a title, using JQ
      await soInfo.filterSoTypes(
        log,
        '.[] | select(.key =="canvas-workpad-template") | .doc_count',
        'TOTAL count of canvas-workpad-template'
      );
    });
```

## From the CLI

Run the cli
> the **--esUrl** arg is required; tells the svc which elastic search endpoint to use

```shell
 λ node scripts/saved_objs_info.js --esUrl http://elastic:changeme@localhost:9220 --soTypes
```

Result

```shell
      ### types:

      [
        {
          doc_count: 5,
          key: 'canvas-workpad-template'
        },
        {
          doc_count: 1,
          key: 'apm-telemetry'
        },
        {
          doc_count: 1,
          key: 'config'
        },
        {
          doc_count: 1,
          key: 'space'
        }
      ]
```


### Myriad ways to use JQ to discern discrete info from the svc
Below, I will leave out the so types call, which is:
`node scripts/saved_objs_info.js --esUrl http://elastic:changeme@localhost:9220 --soTypes --json`

#### At time of this writing, without `jq`, the svc call result was:
`node scripts/saved_objs_info.js --esUrl http://elastic:changeme@localhost:9220 --soTypes`

```
### Saved Object Types Count: 5
[
  {
    doc_count: 5,
    key: 'canvas-workpad-template'
  },
  {
    doc_count: 1,
    key: 'apm-telemetry'
  },
  {
    doc_count: 1,
    key: 'config'
  },
  {
    doc_count: 1,
    key: 'event_loop_delays_daily'
  },
  {
    doc_count: 1,
    key: 'space'
  }
]
```

### Show the keys only  
`jq '.[] | (.key)'` || `jq '.[] | .key'`

```
"canvas-workpad-template"
"apm-telemetry"
"config"
"event_loop_delays_daily"
"space"
```


### Show the count of a specific Saved Object type  
Eg. Count of spaces  
`jq '.[] | select(.key =="space")'`  

```
{
  "key": "space",
  "doc_count": 1
}
```  

### Show the saved objects with a count greater than 2
`jq '.[] | select(.doc_count > 2)'`

```
{
  "key": "canvas-workpad-template",
  "doc_count": 5
}
```  

### Show the TOTAL count of ALL Saved Object types
`jq 'reduce .[].doc_count as $item (0; . + $item)'`

```
9
```  

#### Diffing
You could add a log file to your git index  
and then write to the file again and simply use  
`git diff` to see the difference.  

Similarly, you could write out two different files  
and use your OS's default diff-ing program.  
On OSX, I use `diff before.txt after.txt`

Lastly, you could have two separate terminal  
windows and use your eyes to spot differences,  
that is if you expect differences.

