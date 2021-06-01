# Saved Objects Info Svc w/ CLI

## Used in code 

Get a reference to the svc
```typescript
// Pre FTR Service
const savedObjectInfo = getService('savedObjectInfo');

// Post FTR Service
private readonly savedObjectInfo = this.ctx.getService('savedObjectInfo');
```

Use the svc

```typescript
log.info(
  `\n### SAVED OBJECT TYPES IN index: [.kibana]: \n${await savedObjectInfo.getTypesPretty()}`
);
```

## Used via the cli

Run the cli 
> the **--esUrl** arg is required; tells the svc which elastic search endpoint to use

```shell
 λ node scripts/saved_objs_info.js --esUrl http://elastic:changeme@localhost:9220 --soTypes
```

Result

```shell
 info
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

 λ
```