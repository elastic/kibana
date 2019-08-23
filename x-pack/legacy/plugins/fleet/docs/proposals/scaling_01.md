# Fleet Scailing

## System

For the sake of keeping things simple, the initial pass at performance we will assume Kibana is running on a \*nix based operating system.

To reach scale, the following system modifications need to be made to Linux:

- Raise hard and soft file limit/ulimit to 1024000
- TCP recycle wait (tcp_tw_reuse) is set to a low number, there is a lot of complications here but for now let us assume that number is 1
  Idealy the Kibana would read and walk the user through this setup/config process. Even better would be if Kibana could optionaly make these changes for the user. This could be part of an initial Fleet workflow or perhaps only after the user is starting to reach scale but always accessable via Fleet settings.

## Networking

IP addresses in theory on linux are limited to 65k connections per IP address. Thus we will need to have the system claim aditional IP addresses. Then we will need to round robbin requests to these IPs (basic) or maintain an intelagent list of what is avaliable and route acordingly (better).
This routing can be done using 3rd party tools or load balancers. Perhaps we should consider and evaluate having Fleet support the instilation and configuration of a simple maybe OSS LB to assist with this task?

## Node and high levels of network concurency.

Node at high volume levels can tend to have some issues. In the community, the OSS (Apache2) project uWebSockets has aimed to solve this. This c++ based web server API for node. This server has been tested by many in the community to handle much larger nodes. In a "Lab enviorment" going well above 1m concurent connections on a single modest server assuming a static low CPU response. In the real world, I have used and maintained uWebSockets in a node app that maintained good stability with 97k active concurent socket connections on a single server. I fully belive it could do much more. Maybe 100k - 200k I would consider reasonable to expect / "easy" to maintain.
Moving all of Kibana to using uWebSockets in the near to mid-term would be a massive undertaking. Thus if we take a smaller worker based approch, we could gain the benifits of multiple CPU cores AND do so using small uWebSockets based servers. This would allow us to maxamize performance with no need to affect Kibana core.

### TLS overhead

The above does well when we assume uWebSockets is used for websockets. But, when used as an HTTP/HTTPS server we still have issues regarding TLS overhead. The default TLS in Node 10.x (LTS) is 1.2. However there is a programatic flag for using TLS 1.3. If this flag is used from our Fleet workers, we have yet another added benifit of getting TLS 1.3 with it's 0RTT (zero round trip TLS prtotocal, this almost no overhead) without affecting the rest of Kibana.
Go does not currently support TLS 1.3, but plans seem to indicate it will later in the year, and when it does we can take advantage of it. Until then the effort to support 1.3 in the workers would be minimal and it degrades to 1.2 if the client does not support 1.3 yet.

Much of the above could be slowly over time pulled into core, removing the support cost from the Fleet/Ingest team. But as adding these items to core now would likely cause a very large backlog of work, so building it here would allow for the fastest time to release.
